import { FormEvent, useState } from "react";
import { FilePlus, Save } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import StorePageShell from "./StorePageShell";
import { storeApi } from "@/api/store/storeSystemApi";
export default function CreatePO() {
  const [form, setForm] = useState({
    vendor: "",
    item: "",
    quantity: "",
    deliveryDate: "",
    remarks: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleChange = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFeedback(`PO template for ${form.vendor} · ${form.item} has been saved.`);
  };

  return (
    <StorePageShell
      icon={<FilePlus size={48} className="text-slate-600" />}
      heading="Create Purchase Order"
      subtext="Export PO drafts for buyers and finance"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          placeholder="Vendor name"
          value={form.vendor}
          onChange={(event) => handleChange("vendor")(event.target.value)}
        />
        <Input
          placeholder="Item or service"
          value={form.item}
          onChange={(event) => handleChange("item")(event.target.value)}
        />
        <Input
          placeholder="Quantity"
          value={form.quantity}
          onChange={(event) => handleChange("quantity")(event.target.value)}
        />
        <Input
          placeholder="Delivery date"
          value={form.deliveryDate}
          onChange={(event) => handleChange("deliveryDate")(event.target.value)}
        />
        <Textarea
          placeholder="Remarks"
          value={form.remarks}
          onChange={(event) => handleChange("remarks")(event.target.value)}
          className="resize-none"
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit">Generate PO</Button>
          <Button variant="outline">
            <Save size={16} />
            Save Template
          </Button>
        </div>
        {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
      </form>
    </StorePageShell>
  );
}
