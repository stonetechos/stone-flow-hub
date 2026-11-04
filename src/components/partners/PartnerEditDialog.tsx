import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  HardHat,
  Truck,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Building2,
  FileText,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/forms/Field";
import { QuickForm } from "@/components/forms/QuickForm";
import { PhoneInput, EmailInput, GstInput } from "@/components/forms/inputs/SmartInputs";
import { confirmCloseIfDirty } from "@/hooks/use-unsaved-changes";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import {
  type AssociatedPerson,
  type EditPartnerInput,
  updateAssociatedPartner,
  createApplicationPartner,
  createTransportPartner,
} from "@/lib/partners/directory";

const APPLICATION_SKILL_OPTIONS = [
  "Dry Cladding",
  "Wet Cladding",
  "Stone Flooring",
  "Inlay & Mosaics",
  "Murals & CNC Fixing",
  "High-Elevation Cladding",
  "Stone Polishing",
  "Substrate Waterproofing",
  "Interlocking Ledger",
];

const TRANSPORT_VEHICLE_OPTIONS = [
  "Tata Ace (Chhota Hathi)",
  "Pickup Bolero (Maxi Truck)",
  "14ft Eicher (4-6 MT)",
  "17ft Truck (8-10 MT)",
  "22ft 6-Wheeler",
  "28ft Multi-Axle",
  "32ft Trailer (25-35 MT)",
  "Crane / Hydraulic Unloader",
];

export interface PartnerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AssociatedPerson | null;
  partnerType: "application_partner" | "transport_partner";
  onSuccess?: () => void;
}

export function PartnerEditDialog({
  open,
  onOpenChange,
  editing,
  partnerType,
  onSuccess,
}: PartnerEditDialogProps) {
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [vehicle, setVehicle] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [capacity, setCapacity] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [baseline, setBaseline] = useState("");

  const isAppPartner = partnerType === "application_partner";

  useEffect(() => {
    if (!open) return;

    if (editing) {
      const initName = editing.name || "";
      const initContact = editing.contactPerson || editing.name || "";
      const initPhone = editing.phone || "";
      const initEmail = editing.email || "";
      const cleanCity =
        editing.city &&
        editing.city !== "—" &&
        editing.city !== "On-site / Regional" &&
        editing.city !== "On-site Team" &&
        editing.city !== "Transport Hub"
          ? editing.city
          : "";
      const initCity = cleanCity;
      const initAddress = editing.address || "";
      const initState = editing.state || "";
      const initGst = editing.gstNumber || "";
      const initSkills = Array.isArray(editing.skills) ? [...editing.skills] : [];
      const initVehicle = editing.vehicle || "";
      const initVehicleNo = editing.vehicleNo || "";
      const initCapacity = editing.capacity != null ? String(editing.capacity) : "";
      const initNotes = editing.notes || "";
      const initActive = editing.isActive ?? true;

      setName(initName);
      setContactPerson(initContact);
      setPhone(initPhone);
      setEmail(initEmail);
      setCity(initCity);
      setAddress(initAddress);
      setState(initState);
      setGstNumber(initGst);
      setSkills(initSkills);
      setVehicle(initVehicle);
      setVehicleNo(initVehicleNo);
      setCapacity(initCapacity);
      setNotes(initNotes);
      setIsActive(initActive);

      setBaseline(
        JSON.stringify({
          initName,
          initContact,
          initPhone,
          initEmail,
          initCity,
          initAddress,
          initSkills,
          initVehicle,
          initVehicleNo,
          initCapacity,
          initNotes,
          initActive,
        }),
      );
    } else {
      setName("");
      setContactPerson("");
      setPhone("");
      setEmail("");
      setCity("");
      setAddress("");
      setState("");
      setGstNumber("");
      setSkills(isAppPartner ? ["Dry Cladding"] : []);
      setVehicle("");
      setVehicleNo("");
      setCapacity("");
      setNotes("");
      setIsActive(true);
      setBaseline("");
    }
  }, [open, editing, isAppPartner]);

  const currentPayload = JSON.stringify({
    name,
    contactPerson,
    phone,
    email,
    city,
    address,
    skills,
    vehicle,
    vehicleNo,
    capacity,
    notes,
    isActive,
  });
  const dirty = Boolean(baseline && baseline !== currentPayload);

  const mutation = useMutation({
    mutationFn: async () => {
      const input: EditPartnerInput = {
        name: name.trim(),
        contactPerson: contactPerson.trim() || name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
        state: state.trim() || null,
        gstNumber: gstNumber.trim() || null,
        skills,
        vehicle: vehicle.trim() || null,
        vehicleNo: vehicleNo.trim() || null,
        capacity: capacity ? Number(capacity) : null,
        notes: notes.trim() || null,
        isActive,
      };

      if (editing) {
        await updateAssociatedPartner(editing, input);
      } else {
        if (isAppPartner) {
          await createApplicationPartner(input);
        } else {
          await createTransportPartner(input);
        }
      }
    },
    onSuccess: () => {
      const label = isAppPartner ? "Application Partner" : "Transport Partner";
      toast.success(editing ? `${label} updated` : `${label} added successfully`);

      // Invalidate relevant caches
      qc.invalidateQueries({ queryKey: ["application-partners"] });
      qc.invalidateQueries({ queryKey: ["transport-partners"] });
      qc.invalidateQueries({ queryKey: ["work-and-supply-directory"] });
      qc.invalidateQueries({ queryKey: qk.installationTeams.all });
      qc.invalidateQueries({ queryKey: qk.installationAgencies.list() });
      qc.invalidateQueries({ queryKey: qk.cartingAgencies.list() });
      qc.invalidateQueries({ queryKey: qk.vendors.all });

      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(
        isAppPartner
          ? "Please enter partner / team name"
          : "Please enter transporter / agency name",
      );
      return;
    }
    if (!contactPerson.trim()) {
      toast.error("Please enter contact person name");
      return;
    }
    mutation.mutate();
  };

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && mutation.isPending) return;
        if (confirmCloseIfDirty(o, dirty)) onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-lg ${
                isAppPartner ? "bg-blue-100 text-blue-700" : "bg-sky-100 text-sky-700"
              }`}
            >
              {isAppPartner ? <HardHat className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {editing
                  ? `Edit ${isAppPartner ? "Application Partner" : "Transport Partner"}: ${editing.name}`
                  : `New ${isAppPartner ? "Application Partner" : "Transport Partner"}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isAppPartner
                  ? "Supervisors, application masters, fixing contractors, and dry cladding teams."
                  : "Carting agencies, truck freight, pickup vehicles, and heavy logistics."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <QuickForm onSubmit={handleSubmit} busy={mutation.isPending} dirty={dirty}>
          <QuickForm.QuickFill>
            {/* Row 1: Name and Contact Person */}
            <Field
              label={
                isAppPartner ? "Agency / Company / Team Name" : "Transporter / Agency / Firm Name"
              }
              required
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  isAppPartner
                    ? "e.g. Sompura Stone Fixing Works, Apex Elevation Team"
                    : "e.g. Mahadev Roadways, Shree Ram Carting Logistics"
                }
                required
              />
            </Field>

            <Field
              label={
                isAppPartner
                  ? "Master Mason / Supervisor / Contact Person"
                  : "Transporter / Driver / Contact Person"
              }
              required
            >
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Bhai Sompura"
                required
              />
            </Field>

            {/* Row 2: Mobile / WhatsApp (Optional) and Email */}
            <Field label="Mobile / WhatsApp Phone (Optional)">
              <PhoneInput value={phone} onChange={setPhone} placeholder="10-digit mobile number" />
            </Field>

            <Field label="Email Address">
              <EmailInput value={email} onChange={setEmail} placeholder="partner@example.com" />
            </Field>

            {/* Row 3: City and Address */}
            <Field label="Operational City / Base Hub">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={
                  isAppPartner
                    ? "e.g. Ahmedabad, Surat, Makrana, Udaipur"
                    : "e.g. Ahmedabad Aslali Hub, Makrana Transport Nagar"
                }
              />
            </Field>

            <Field label="GSTIN / Tax ID">
              <GstInput
                value={gstNumber}
                onChange={setGstNumber}
                placeholder="15-character GSTIN (Optional)"
              />
            </Field>

            {/* Row 4: Specific Section depending on Partner Type */}
            {isAppPartner ? (
              <>
                <div className="md:col-span-2 space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> Application Skills &
                      Specializations
                    </label>
                    <span className="text-[11px] text-muted-foreground">Select all that apply</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {APPLICATION_SKILL_OPTIONS.map((skill) => {
                      const active = skills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                            active
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {active && <CheckCircle2 className="h-3 w-3" />}
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Field label="Assigned Vehicle / Transport (Optional)">
                  <Input
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    placeholder="e.g. Bolero Maxi Truck (GJ-01-XX-1234)"
                  />
                </Field>

                <Field label="Daily Capacity (sqft / day)">
                  <Input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="e.g. 150"
                  />
                </Field>
              </>
            ) : (
              <>
                <div className="md:col-span-2 space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-primary" /> Vehicle Types & Fleet
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Click to toggle vehicle types
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {TRANSPORT_VEHICLE_OPTIONS.map((vOpt) => {
                      const active =
                        vehicle.toLowerCase().includes(vOpt.toLowerCase()) || skills.includes(vOpt);
                      return (
                        <button
                          key={vOpt}
                          type="button"
                          onClick={() => {
                            if (active) {
                              setSkills((prev) => prev.filter((s) => s !== vOpt));
                              if (vehicle.includes(vOpt)) {
                                setVehicle((prev) =>
                                  prev
                                    .split(",")
                                    .map((x) => x.trim())
                                    .filter((x) => x && x !== vOpt)
                                    .join(", "),
                                );
                              }
                            } else {
                              setSkills((prev) => [...prev, vOpt]);
                              setVehicle((prev) => (prev ? `${prev}, ${vOpt}` : vOpt));
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                            active
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {active && <CheckCircle2 className="h-3 w-3" />}
                          {vOpt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Field label="Vehicle Registration Number(s)">
                  <Input
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="e.g. GJ-01-XX-1234, RJ-14-GA-5678"
                  />
                </Field>

                <Field label="Primary Vehicle Type">
                  <Input
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    placeholder="e.g. 14ft Eicher, 22ft Trailer"
                  />
                </Field>
              </>
            )}

            {/* Address */}
            <Field label="Address / Workshop / Yard Location" className="md:col-span-2">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address, godown or workshop location"
              />
            </Field>

            {/* Notes & Payment Terms */}
            <Field label="Notes / Tariff & Rates / Special Terms" className="md:col-span-2">
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  isAppPartner
                    ? "e.g. ₹45/sqft for dry cladding, ₹28/sqft for flooring. Payment terms: 50% advance, 50% on completion."
                    : "e.g. Ahmedabad local carting ₹1,800/trip; Makrana to Ahmedabad ₹4.50/kg or ₹16,000 per 14ft truck."
                }
              />
            </Field>

            {/* Status Switch */}
            <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Active Partner</label>
                <p className="text-xs text-muted-foreground">
                  Active partners appear in job assignments, delivery dispatches, and quick pickers.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </QuickForm.QuickFill>

          <DialogFooter className="mt-4 pt-2 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : editing ? "Save Changes" : "Create Partner"}
            </Button>
          </DialogFooter>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}
