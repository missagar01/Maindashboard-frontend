import {
  type ReactNode,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BadgeCheck,
  Building2,
  Factory,
  RefreshCw,
  Rows3,
  Search,
  Users,
} from "lucide-react";

import { storeApi } from "@/api/store/storeSystemApi";
import { cn } from "@/lib/utils";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

type VendorRegistrationRecord = {
  id: string;
  timestamp: string;
  supplierName: string;
  gstNo: string;
  correspondenceAddress: string;
  factoryOrFirmName: string;
  yearOfEstablishment: string;
  productType: string;
  mobileNumber: string;
  email: string;
  typeOfBusiness: string;
  clientNames: string;
  companyOwnerName: string;
  ownerEmail: string;
  vendorRegistrationNumber: string;
  whatsappStatus: string;
};

type VendorRegistrationResponse = {
  success?: boolean;
  data?: VendorRegistrationRecord[];
  meta?: {
    total?: number;
    source?: string;
    fetchedAt?: string;
  };
  message?: string;
};

const EMPTY_VALUE = "-";

const formatDate = (value?: string) => {
  if (!value) return EMPTY_VALUE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
};

const normalizeLookupValue = (value: string) => value.trim().toLowerCase();

const toUniqueOptions = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right)
  );

const getStatusClasses = (value: string) =>
  normalizeLookupValue(value) === "sent"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-100 text-slate-600";

const getRecordKey = (
  record: VendorRegistrationRecord,
  index: number
) =>
  [
    record.id,
    record.vendorRegistrationNumber,
    record.timestamp,
    record.supplierName,
    index,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join("-");

function SummaryCard({
  title,
  value,
  hint,
  accentClassName,
  icon,
}: {
  title: string;
  value: number;
  hint: string;
  accentClassName: string;
  icon: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm md:px-4 md:py-4">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1.5 rounded-full",
          accentClassName
        )}
      />
      <div className="flex items-start justify-between gap-2 md:gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:text-[11px] md:tracking-[0.24em]">
            {title}
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900 md:text-3xl">
            {value}
          </p>
          <p className="mt-1 hidden text-xs text-slate-500 md:block">{hint}</p>
        </div>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 md:size-10 md:rounded-2xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function MobileField({
  label,
  value,
  className,
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 whitespace-normal break-words text-sm text-slate-700">
        {value?.trim() || EMPTY_VALUE}
      </p>
    </div>
  );
}

export default function VendorRegistration() {
  const [records, setRecords] = useState<VendorRegistrationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [businessType, setBusinessType] = useState("all");
  const [meta, setMeta] = useState<VendorRegistrationResponse["meta"]>();

  const deferredSearch = useDeferredValue(search);

  const loadRecords = async (refresh = false) => {
    setLoading(true);
    setError("");
    try {
      const response = (await storeApi.getVendorRegistrations(
        refresh
      )) as VendorRegistrationResponse;

      if (!response?.success || !Array.isArray(response.data)) {
        throw new Error(response?.message || "Unexpected response");
      }

      setRecords(response.data);
      setMeta(response.meta);
    } catch (err) {
      console.error("Unable to load vendor registrations", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load vendor registrations"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const businessTypeOptions = useMemo(
    () => toUniqueOptions(records.map((record) => record.typeOfBusiness)),
    [records]
  );

  const filteredRecords = useMemo(() => {
    const query = normalizeLookupValue(deferredSearch);

    return records.filter((record) => {
      const matchesQuery =
        !query ||
        [
          record.supplierName,
          record.gstNo,
          record.vendorRegistrationNumber,
          record.mobileNumber,
          record.email,
          record.companyOwnerName,
          record.productType,
          record.typeOfBusiness,
          record.clientNames,
        ].some((value) => normalizeLookupValue(value).includes(query));

      const matchesBusinessType =
        businessType === "all" || record.typeOfBusiness === businessType;

      return matchesQuery && matchesBusinessType;
    });
  }, [records, deferredSearch, businessType]);

  const summary = useMemo(() => {
    const sentCount = records.filter(
      (record) => normalizeLookupValue(record.whatsappStatus) === "sent"
    ).length;
    const manufacturerCount = records.filter((record) =>
      normalizeLookupValue(record.typeOfBusiness).includes("manufacturer")
    ).length;

    return {
      total: records.length,
      sentCount,
      manufacturerCount,
      visible: filteredRecords.length,
    };
  }, [filteredRecords.length, records]);

  const summaryCards = [
    {
      title: "Total Vendors",
      value: summary.total,
      hint: "Vendor master rows",
      accentClassName: "bg-slate-900",
      icon: <Building2 className="size-5" />,
    },
    {
      title: "WhatsApp Sent",
      value: summary.sentCount,
      hint: "Communication pushed",
      accentClassName: "bg-emerald-500",
      icon: <BadgeCheck className="size-5" />,
    },
    {
      title: "Manufacturers",
      value: summary.manufacturerCount,
      hint: "Business type match",
      accentClassName: "bg-sky-500",
      icon: <Factory className="size-5" />,
    },
    {
      title: "Visible Rows",
      value: summary.visible,
      hint: "After search and filters",
      accentClassName: "bg-violet-500",
      icon: <Rows3 className="size-5" />,
    },
  ];

  return (
    <div className="w-full px-0 py-2 sm:px-3 sm:py-3 md:px-4 md:py-4">
      <div className="space-y-3 bg-[linear-gradient(180deg,#fff7ed_0%,#fff1f2_42%,#eff6ff_100%)] p-0 sm:rounded-[28px] sm:p-3 sm:shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] md:space-y-4 md:p-4">
        <section className="overflow-hidden bg-transparent shadow-none backdrop-blur sm:rounded-[24px] sm:border sm:border-white/80 sm:bg-white/80 sm:shadow-sm">
          <div className="flex flex-col gap-4 px-3 py-3 sm:px-4 sm:py-4 md:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-sm ring-1 ring-rose-100">
                <Building2 size={28} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-rose-500">
                  Store Master
                </p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
                  Vendor Registration
                </h1>
              </div>
            </div>

           
          </div>
        </section>

        <section className="space-y-3 bg-transparent p-0 shadow-none backdrop-blur sm:rounded-[24px] sm:border sm:border-white/70 sm:bg-white/90 sm:p-3 sm:shadow-sm md:space-y-4 md:p-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryCard key={card.title} {...card} />
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/85 p-3">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(240px,0.8fr)_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search supplier, GST, registration no, owner, product..."
                  className="h-11 border-slate-200 bg-white pl-10 shadow-none"
                />
              </div>

              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger className="h-11 w-full border-slate-200 bg-white">
                  <SelectValue placeholder="Business type" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  avoidCollisions={false}
                  className="max-h-[18rem] border-slate-200 bg-white text-slate-900 shadow-xl backdrop-blur-none"
                >
                  <SelectItem value="all">All Business Types</SelectItem>
                  {businessTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                onClick={() => loadRecords(true)}
                disabled={loading}
                className="h-11 min-w-[150px] border-slate-200 bg-white shadow-none"
              >
                <RefreshCw
                  className={cn(
                    "mr-2 size-4",
                    loading ? "animate-spin" : undefined
                  )}
                />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-slate-500" />
              <span>
                Showing <strong>{filteredRecords.length}</strong> of{" "}
                <strong>{records.length}</strong> vendors
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span>Source: {meta?.source || "live"}</span>
              <span>Fetched: {formatDate(meta?.fetchedAt)}</span>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-3 lg:hidden">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
                Loading vendor registrations...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
                No vendor registration records found for the current filters.
              </div>
            ) : (
              filteredRecords.map((record, index) => (
                <article
                  key={getRecordKey(record, index)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Vendor Reg No
                      </p>
                      <h2 className="mt-1 text-base font-semibold text-slate-900">
                        {record.vendorRegistrationNumber || EMPTY_VALUE}
                      </h2>
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        {record.supplierName || EMPTY_VALUE}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                        getStatusClasses(record.whatsappStatus)
                      )}
                    >
                      {record.whatsappStatus || "NA"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MobileField label="GST No" value={record.gstNo} />
                    <MobileField label="Mobile" value={record.mobileNumber} />
                    <MobileField
                      label="Business Type"
                      value={record.typeOfBusiness}
                    />
                    <MobileField
                      label="Established"
                      value={record.yearOfEstablishment}
                    />
                    <MobileField
                      label="Owner"
                      value={record.companyOwnerName}
                      className="col-span-2"
                    />
                    <MobileField
                      label="Email"
                      value={record.email}
                      className="col-span-2"
                    />
                    <MobileField
                      label="Owner Email"
                      value={record.ownerEmail}
                      className="col-span-2"
                    />
                  </div>

                  <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-3">
                    <MobileField
                      label="Product Type"
                      value={record.productType}
                    />
                    <MobileField label="Clients" value={record.clientNames} />
                    <MobileField
                      label="Factory/Firm"
                      value={record.factoryOrFirmName}
                    />
                    <MobileField
                      label="Correspondence Address"
                      value={record.correspondenceAddress}
                    />
                    <MobileField
                      label="Registered On"
                      value={formatDate(record.timestamp)}
                    />
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
              <Table className="min-w-[1460px]">
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-slate-200">
                    <TableHead className="text-left">Vendor Reg No</TableHead>
                    <TableHead className="text-left">Supplier Name</TableHead>
                    <TableHead className="text-left">GST No</TableHead>
                    <TableHead className="text-left">Business Type</TableHead>
                    <TableHead className="text-left">Product Type</TableHead>
                    <TableHead className="text-left">Mobile</TableHead>
                    <TableHead className="text-left">Email</TableHead>
                    <TableHead className="text-left">Owner</TableHead>
                    <TableHead className="text-left">Owner Email</TableHead>
                    <TableHead className="text-left">Clients</TableHead>
                    <TableHead className="text-left">
                      Correspondence Address
                    </TableHead>
                    <TableHead className="text-left">Factory/Firm</TableHead>
                    <TableHead className="text-left">Established</TableHead>
                    <TableHead className="text-left">WhatsApp</TableHead>
                    <TableHead className="text-left">Registered On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={15}
                        className="py-10 text-center text-slate-500"
                      >
                        Loading vendor registrations...
                      </TableCell>
                    </TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={15}
                        className="py-10 text-center text-slate-500"
                      >
                        No vendor registration records found for the current
                        filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record, index) => (
                      <TableRow
                        key={getRecordKey(record, index)}
                        className="align-top hover:bg-rose-50/40"
                      >
                        <TableCell className="text-left font-semibold text-slate-900">
                          {record.vendorRegistrationNumber || EMPTY_VALUE}
                        </TableCell>
                        <TableCell className="max-w-[220px] whitespace-normal text-left">
                          {record.supplierName || EMPTY_VALUE}
                        </TableCell>
                        <TableCell className="text-left">
                          {record.gstNo || EMPTY_VALUE}
                        </TableCell>
                        <TableCell className="max-w-[220px] whitespace-normal text-left">
                          {record.typeOfBusiness || EMPTY_VALUE}
                        </TableCell>
                        <TableCell className="max-w-[260px] whitespace-normal text-left">
                          {record.productType || EMPTY_VALUE}
                        </TableCell>
                        <TableCell className="text-left">
                          {record.mobileNumber || EMPTY_VALUE}
                        </TableCell>
                        <TableCell className="max-w-[220px] break-all whitespace-normal text-left">
                          {record.email || EMPTY_VALUE}
                        </TableCell>
                        <TableCell className="max-w-[180px] whitespace-normal text-left">
                          {record.companyOwnerName || EMPTY_VALUE}
                        </TableCell>
                        <TableCell className="max-w-[220px] break-all whitespace-normal text-left">
                          {record.ownerEmail || EMPTY_VALUE}
                        </TableCell>
                        <TableCell className="max-w-[260px] whitespace-normal text-left">
                          {record.clientNames || EMPTY_VALUE}
                        </TableCell>
                        <TableCell className="max-w-[260px] whitespace-normal text-left">
                          {record.correspondenceAddress || EMPTY_VALUE}
                        </TableCell>
                        <TableCell className="max-w-[220px] whitespace-normal text-left">
                          {record.factoryOrFirmName || EMPTY_VALUE}
                        </TableCell>
                        <TableCell className="text-left">
                          {record.yearOfEstablishment || EMPTY_VALUE}
                        </TableCell>
                        <TableCell className="text-left">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                              getStatusClasses(record.whatsappStatus)
                            )}
                          >
                            {record.whatsappStatus || "NA"}
                          </span>
                        </TableCell>
                        <TableCell className="text-left">
                          {formatDate(record.timestamp)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
